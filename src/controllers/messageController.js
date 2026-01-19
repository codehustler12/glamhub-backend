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

// @desc    Get all conversations (list of people you've messaged)
// @route   GET /api/client/messages/conversations OR /api/artist/messages/conversations
// @access  Private
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get all unique conversations (people you've messaged or received messages from)
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
              '$receiverId',
              '$senderId'
            ]
          },
          appointmentId: { $first: '$appointmentId' },
          lastMessage: { $first: '$message' },
          lastMessageTime: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointment'
        }
      },
      {
        $unwind: {
          path: '$appointment',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          username: '$user.username',
          avatar: '$user.avatar',
          appointmentId: '$appointmentId',
          appointmentDate: '$appointment.appointmentDate',
          appointmentTime: '$appointment.appointmentTime',
          lastMessage: 1,
          lastMessageTime: 1,
          unreadCount: 1
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

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

// @desc    Get messages for a specific conversation
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
      .populate('senderId', 'firstName lastName username avatar')
      .populate('receiverId', 'firstName lastName username avatar')
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

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        appointment: {
          _id: appointment._id,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime
        },
        participant: otherParticipant,
        messages: messages.reverse() // Reverse to show oldest first
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
