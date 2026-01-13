const Service = require('../models/Service');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Artist only)
exports.createService = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    // Check if user is an artist
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can create services'
      });
    }

    const {
      serviceName,
      serviceDescription,
      serviceType,
      priceType,
      price,
      currency,
      duration,
      addOns
    } = req.body;

    const service = await Service.create({
      artistId: req.user.id,
      serviceName,
      serviceDescription: serviceDescription || '',
      serviceType,
      priceType: priceType || 'fixed',
      price,
      currency: currency || 'AED',
      duration,
      addOns: addOns || []
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: {
        service
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all services for logged-in artist
// @route   GET /api/services
// @access  Private (Artist only)
exports.getMyServices = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can view their services'
      });
    }

    const services = await Service.find({ 
      artistId: req.user.id 
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: {
        services
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single service
// @route   GET /api/services/:id
// @access  Private
exports.getService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate('artistId', 'firstName lastName username avatar');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        service
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Artist - owner only)
exports.updateService = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user owns this service
    if (service.artistId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service'
      });
    }

    // Update fields
    const fieldsToUpdate = {
      serviceName: req.body.serviceName,
      serviceDescription: req.body.serviceDescription,
      serviceType: req.body.serviceType,
      priceType: req.body.priceType,
      price: req.body.price,
      currency: req.body.currency,
      duration: req.body.duration,
      addOns: req.body.addOns,
      isActive: req.body.isActive
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    service = await Service.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: {
        service
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Artist - owner only)
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check if user owns this service
    if (service.artistId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this service'
      });
    }

    await service.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all services by artist (public)
// @route   GET /api/services/artist/:artistId
// @access  Public
exports.getServicesByArtist = async (req, res, next) => {
  try {
    const services = await Service.find({ 
      artistId: req.params.artistId,
      isActive: true 
    }).populate('artistId', 'firstName lastName username avatar').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: {
        services
      }
    });
  } catch (error) {
    next(error);
  }
};
