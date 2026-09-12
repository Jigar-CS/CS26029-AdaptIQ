const ActivityLog = require('../models/ActivityLog');
const { success } = require('../utils/responseFormatter');

/**
 * GET /admin/activity-logs
 * Paginated, filterable activity logs for admin audit trail
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      action_type,
      action,
      user_id,
      search,
    } = req.query;

    const filterAction = action_type || action || null;
    const filterUserId = user_id ? parseInt(user_id, 10) : null;

    const [result, actionTypes] = await Promise.all([
      ActivityLog.findAndCountAll({
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
        action_type: filterAction,
        user_id: filterUserId,
        search,
      }),
      ActivityLog.getActionTypes(),
    ]);

    return success(res, {
      logs: result.logs,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      action_types: actionTypes,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getActivityLogs,
};
