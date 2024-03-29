/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');
const ApiError = require('../../error/ApiError');
const { Device, DeviceInfo, Rating } = require('../../models');
const { ratings } = require('../../constants/ratings');
const { moveFile, moveFiles } = require('../../utils/files');
const { Type } = require('../../models/Type');
const { DeviceFeedback } = require('../../models/DeviceFeedback');
const { User } = require('../../models/User');

class DeviceController {
  async create(req, res, next) {
    try {
      const {
        name, price, brandId, typeId, info,
      } = req.body;

      const {
        preview, images,
      } = req.files;

      const previewFileName = moveFile(preview);
      const imagesFilesNames = moveFiles(images);

      const device = await Device.create({
        name,
        price,
        brandId,
        typeId,
        preview: previewFileName,
        images: imagesFilesNames,
      });

      if (info) {
        JSON.parse(info).forEach((i) => DeviceInfo.create({
          title: i.title,
          description: i.description,
          deviceId: device.id,
        }));
      }

      return res.json(device);
    } catch (e) {
      return next(ApiError.badRequest(e.message));
    }
  }

  async getAll(req, res, next) {
    const {
      limit = 10, page = 1, type, rating, price, brands = [],
    } = req.query;

    const offset = page * limit - limit;
    const where = {
      typeId: type || {
        [Op.not]: null,
      },
      // rating: rating || {
      //   [Op.not]: null,
      // },
      brandId: {
        [Op.or]: brands,
      },
      price: {
        [Op.and]: {
          [Op.gte]: price?.from || 0,
          [Op.lte]: price?.to || Number.MAX_SAFE_INTEGER,
        },
      },
    };
    const include = [
      {
        model: Rating,
        as: 'ratings',
        attributes: ['id', 'rate'],
      },
    ];
    const query = {
      where, include, limit, offset,
    };

    try {
      const filteredBrands = await Device.findAndCountAll(query);
      return res.status(200).json(filteredBrands);
    } catch (err) {
      return next(ApiError.badRequest('Ничего не найдено'));
    }
  }

  async getOne(req, res, next) {
    const { id } = req.params;

    const device = await Device.findOne({
      include: [
        {
          model: Rating,
          required: false,
          attributes: [],
        },
        {
          model: Type,
          attributes: ['name'],
        },
        {
          model: DeviceInfo,
          as: 'info',
        },
        {
          model: DeviceFeedback,
          as: 'feedback',
          include: [
            {
              model: User,
              attributes: ['login'],
            },
            {
              model: Rating,
              attributes: ['rate'],
            },
          ],
        },
      ],
      attributes: [
        'id',
        'count',
        'price',
        'name',
        'images',
        'preview',
        [Sequelize.cast(Sequelize.fn('avg', Sequelize.col('ratings.rate')), 'FLOAT'), 'avgRate'],
        [Sequelize.cast(Sequelize.fn('count', Sequelize.col('ratings.rate')), 'INTEGER'), 'votes'],
      ],
      group: [
        'device.id',
        'device.count',
        'device.price',
        'device.name',
        'device.images',
        'device.preview',
        'info.id',
        'feedback.id',
        'feedback->user.id',
        'feedback->rating.id',
        'type.id',
        'type.name',
        'ratings.deviceId',
      ],
      where: { id },
    });

    try {
      return res.status(200).json(device);
    } catch (err) {
      return next(ApiError.badRequest());
    }
  }

  async removeOne(req, res, next) {
    const { id } = req.params;

    try {
      const device = await Device.destroy({
        where: {
          id,
        },
      });

      if (!device) {
        return next(ApiError.badRequest('Сущность не найдена'));
      }

      return res.status(200).json(device);
    } catch (err) {
      return next(ApiError.badRequest());
    }
  }

  getRatings(req, res) {
    return res.status(200).json(ratings.map((rating) => ({ text: rating, value: rating })));
  }

  async createFeedback(req, res, next) {
    try {
      const {
        title,
        value,
        rating,
        deviceId,
      } = req.body;

      // const {
      //   images = [],
      // } = req.files;

      // console.log(req.files);
      // const imagesFilesNames = moveFiles(images);

      const createdRating = await Rating.create({
        rate: rating,
        userId: req.user.id,
        deviceId,
      });

      const feedback = await DeviceFeedback.create({
        title,
        value,
        deviceId,
        userId: req.user.id,
        ratingId: createdRating.id,
        // images: imagesFilesNames,
      });

      return res.json(feedback);
    } catch (e) {
      return next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new DeviceController();
