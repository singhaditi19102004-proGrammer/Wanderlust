const Joi = require('joi');

// MASTER SHIELD: Schema supports both nested listing objects and flat frontend forms
module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().required().min(0),
        image: Joi.string().allow("", null),
        category: Joi.string().allow("", null)
    }),
    // Fallback layer: validates individual flat inputs directly if no listing object wraps them
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    location: Joi.string().optional(),
    country: Joi.string().optional(),
    price: Joi.number().optional().min(0),
    image: Joi.string().allow("", null),
    category: Joi.string().allow("", null)
}).unknown(true); // Keeps Joi from crashing if any unexpected metadata fields arrive

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required(),
});