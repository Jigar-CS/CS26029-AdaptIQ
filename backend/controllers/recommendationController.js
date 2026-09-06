const Recommendation = require('../models/Recommendation');
const recommendationService = require('../services/recommendationService');
const ActivityLog = require('../models/ActivityLog');

const recommendationController = {
  /**
   * GET /recommendations
   * Fetch active (undismissed) recommendations for the student.
   * Optional query param ?refresh=true to re-evaluate rules before responding.
   */
  getRecommendations: async (req, res, next) => {
    try {
      const userId = req.user.id;

      if (req.query.refresh === 'true') {
        await recommendationService.generateForUser(userId);
      }

      const recommendations = await Recommendation.findActive(userId);
      return res.json({
        success: true,
        data: { recommendations },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /recommendations/:id/dismiss
   * Dismiss a specific recommendation card.
   */
  dismissRecommendation: async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.id;

      const dismissed = await Recommendation.dismiss(id, userId);

      if (!dismissed) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Recommendation not found or already dismissed' },
        });
      }

      // Log dismiss action in activity log
      try {
        await ActivityLog.log({
          user_id: userId,
          action_type: 'recommendation_dismissed',
          details: { recommendation_id: id },
        });
      } catch {
        // non-blocking
      }

      return res.json({
        success: true,
        data: { dismissed: true },
        message: 'Recommendation dismissed',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = recommendationController;
