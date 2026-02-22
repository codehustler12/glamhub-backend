const Message = require('../models/Message');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// @desc    Send a message
// @route   POST /api/client/messages OR /api/artist/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { receiverId, appointmentId, message } = req.body;
    const senderId = req.user.id;
    const userRole = req.user.role;

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify user is part of this appointment
    if (userRole === 'user') {
      // Client sending message
      if (appointment.clientId.toString() !== senderId) {
        return res.status(403).json({
          success: false,
          message: 'You can only send messages for your own appointments'
        });
      }
      if (appointment.artistId.toString() !== receiverId) {
        return res.status(403).json({
          success: false,
          message: 'You can only message the artist of this appointment'
        });
      }
    } else if (userRole === 'artist') {
      // Artist sending message
      if (appointment.artistId.toString() !== senderId) {
        return res.status(403).json({
          success: false,
          message: 'You can only send messages for your own appointments'
        });
      }
      if (appointment.clientId.toString() !== receiverId) {
        return res.status(403).json({
          success: false,
          message: 'You can only message the client of this appointment'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only clients and artists can send messages'
      });
    }

    // Verify receiver exists and has correct role
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Verify role compatibility
    if (userRole === 'user' && receiver.role !== 'artist') {
      return res.status(400).json({
        success: false,
        message: 'Clients can only message artists'
      });
    }
    if (userRole === 'artist' && receiver.role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Artists can only message clients'
      });
    }

    // Create message
    const newMessage = await Message.create({
      senderId,
      receiverId,
      appointmentId,
      message: message.trim()
    });

    // Populate sender and receiver details
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'firstName lastName username avatar')
      .populate('receiverId', 'firstName lastName username avatar')
      .populate('appointmentId', 'appointmentDate appointmentTime serviceId');

    // Real-time: notify the receiver so their chat updates without reload
    try {
      const { getIO } = require('../socket');
      const socketIO = getIO();
      if (socketIO) {
        const payload = {
          _id: populatedMessage._id,
          message: populatedMessage.message,
          senderId: populatedMessage.senderId,
          receiverId: populatedMessage.receiverId,
          appointmentId: populatedMessage.appointmentId,
          isRead: populatedMessage.isRead,
          readAt: populatedMessage.readAt,
          createdAt: populatedMessage.createdAt,
          updatedAt: populatedMessage.updatedAt
        };
        socketIO.to(`user:${receiverId}`).emit('new_message', payload);
      }
    } catch (socketErr) {
      console.warn('Socket emit failed (message still saved):', socketErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: populatedMessage
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations (one per artist/client pair, not per appointment)
// @route   GET /api/client/messages/conversations OR /api/artist/messages/conversations
// @access  Private
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build appointment filter based on user role
    const appointmentFilter = userRole === 'user'
      ? { clientId: new mongoose.Types.ObjectId(userId) }
      : { artistId: new mongoose.Types.ObjectId(userId) };

    // Get all appointments for this user
    const appointments = await Appointment.find(appointmentFilter)
      .select('_id clientId artistId appointmentDate appointmentTime status')
      .populate(userRole === 'user' ? 'artistId' : 'clientId', 'firstName lastName username avatar')
      .sort({ appointmentDate: -1, appointmentTime: -1 });

    const appointmentIds = appointments.map(apt => apt._id);
    if (appointmentIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: { conversations: [] }
      });
    }

    // Get all messages for these appointments
    const messages = await Message.find({
      appointmentId: { $in: appointmentIds }
    })
      .sort({ createdAt: -1 });

    // Group by the other user (one conversation per artist-client pair)
    const otherUserKey = (apt) => {
      const other = userRole === 'user' ? apt.artistId : apt.clientId;
      return (other && other._id ? other._id : other).toString();
    };
    const conversationByUser = {};

    appointments.forEach(appointment => {
      const key = otherUserKey(appointment);
      const otherUser = userRole === 'user' ? appointment.artistId : appointment.clientId;
      if (conversationByUser[key]) {
        // Already have this user: add appointment to list and keep latest lastMessage
        conversationByUser[key].appointments.push({
          _id: appointment._id,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          status: appointment.status
        });
        return;
      }
      conversationByUser[key] = {
        userId: otherUser._id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        username: otherUser.username,
        avatar: otherUser.avatar || '',
        appointments: [{
          _id: appointment._id,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          status: appointment.status
        }],
        lastMessage: null,
        lastMessageTime: appointment.createdAt,
        unreadCount: 0
      };
    });

    // Attach last message and unread count per user (across all their appointments)
    messages.forEach(msg => {
      const apt = appointments.find(a => a._id.toString() === msg.appointmentId.toString());
      if (!apt) return;
      const key = otherUserKey(apt);
      const conv = conversationByUser[key];
      if (!conv) return;
      if (!conv.lastMessage || new Date(msg.createdAt) > new Date(conv.lastMessageTime)) {
        conv.lastMessage = msg.message;
        conv.lastMessageTime = msg.createdAt;
      }
      if (msg.receiverId.toString() === userId && !msg.isRead) {
        conv.unreadCount += 1;
      }
    });

    const conversations = Object.values(conversationByUser);
    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: {
        conversations
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages with a user (one thread per artist-client, across all appointments)
// @route   GET /api/client/messages/with/:userId OR /api/artist/messages/with/:userId
// @access  Private
exports.getMessagesWithUser = async (req, res, next) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 50 } = req.query;

    const otherId = new mongoose.Types.ObjectId(otherUserId);

    // Ensure the two users have at least one appointment together
    const currentId = new mongoose.Types.ObjectId(currentUserId);
    const appointmentFilter = userRole === 'user'
      ? { clientId: currentId, artistId: otherId }
      : { artistId: currentId, clientId: otherId };
    const sharedAppointments = await Appointment.find(appointmentFilter).select('_id');
    const appointmentIds = sharedAppointments.map(a => a._id);

    if (appointmentIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You have no appointments with this user'
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({
      appointmentId: { $in: appointmentIds }
    })
      .populate('senderId', 'firstName lastName username avatar role')
      .populate('receiverId', 'firstName lastName username avatar role')
      .populate('appointmentId', 'appointmentDate appointmentTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Message.countDocuments({
      appointmentId: { $in: appointmentIds }
    });

    const unreadMessages = messages.filter(
      msg => msg.receiverId._id.toString() === currentUserId && !msg.isRead
    );
    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map(msg => msg._id) },
          receiverId: currentUserId,
          isRead: false
        },
        { $set: { isRead: true, readAt: new Date() } }
      );
      unreadMessages.forEach(msg => {
        msg.isRead = true;
        msg.readAt = new Date();
      });
    }

    const otherParticipant = await User.findById(otherUserId)
      .select('firstName lastName username avatar');

    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      message: msg.message,
      appointmentId: msg.appointmentId ? msg.appointmentId._id : null,
      appointmentDate: msg.appointmentId ? msg.appointmentId.appointmentDate : null,
      sender: {
        _id: msg.senderId._id,
        firstName: msg.senderId.firstName,
        lastName: msg.senderId.lastName,
        username: msg.senderId.username,
        avatar: msg.senderId.avatar || '',
        role: msg.senderId.role
      },
      receiver: {
        _id: msg.receiverId._id,
        firstName: msg.receiverId.firstName,
        lastName: msg.receiverId.lastName,
        username: msg.receiverId.username,
        avatar: msg.receiverId.avatar || '',
        role: msg.receiverId.role
      },
      isSentByMe: msg.senderId._id.toString() === currentUserId,
      isRead: msg.isRead,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: formattedMessages.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        participant: otherParticipant,
        currentUser: {
          _id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          username: req.user.username,
          avatar: req.user.avatar || '',
          role: req.user.role
        },
        messages: formattedMessages
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a specific conversation (by appointment)
// @route   GET /api/client/messages/:appointmentId OR /api/artist/messages/:appointmentId
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { page = 1, limit = 50 } = req.query;

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify user is part of this appointment
    if (userRole === 'user' && appointment.clientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view messages for your own appointments'
      });
    }
    if (userRole === 'artist' && appointment.artistId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view messages for your own appointments'
      });
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get messages for this appointment
    const messages = await Message.find({ appointmentId })
      .populate('senderId', 'firstName lastName username avatar role')
      .populate('receiverId', 'firstName lastName username avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Message.countDocuments({ appointmentId });

    // Mark messages as read if user is the receiver
    const unreadMessages = messages.filter(
      msg => msg.receiverId._id.toString() === userId && !msg.isRead
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map(msg => msg._id) },
          receiverId: userId,
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      // Update the messages in response
      messages.forEach(msg => {
        if (msg.receiverId._id.toString() === userId) {
          msg.isRead = true;
          msg.readAt = new Date();
        }
      });
    }

    // Get the other participant (for conversation header)
    const otherParticipantId = userRole === 'user' 
      ? appointment.artistId 
      : appointment.clientId;
    
    const otherParticipant = await User.findById(otherParticipantId)
      .select('firstName lastName username avatar');

    // Format messages with isSentByMe flag for easier frontend handling
    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      message: msg.message,
      sender: {
        _id: msg.senderId._id,
        firstName: msg.senderId.firstName,
        lastName: msg.senderId.lastName,
        username: msg.senderId.username,
        avatar: msg.senderId.avatar || '',
        role: msg.senderId.role
      },
      receiver: {
        _id: msg.receiverId._id,
        firstName: msg.receiverId.firstName,
        lastName: msg.receiverId.lastName,
        username: msg.receiverId.username,
        avatar: msg.receiverId.avatar || '',
        role: msg.receiverId.role
      },
      isSentByMe: msg.senderId._id.toString() === userId,
      isRead: msg.isRead,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: formattedMessages.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        appointment: {
          _id: appointment._id,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          status: appointment.status
        },
        participant: otherParticipant,
        currentUser: {
          _id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          username: req.user.username,
          avatar: req.user.avatar || '',
          role: req.user.role
        },
        messages: formattedMessages
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   PUT /api/client/messages/:appointmentId/read OR /api/artist/messages/:appointmentId/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify user is part of this appointment
    if (appointment.clientId.toString() !== userId && appointment.artistId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only mark messages as read for your own appointments'
      });
    }

    // Mark all unread messages as read
    const result = await Message.updateMany(
      {
        appointmentId,
        receiverId: userId,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: {
        updatedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};
