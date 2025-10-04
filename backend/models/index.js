// Export all models for easy importing
const UserModel = require('./UserModel');
const StudentModel = require('./StudentModel');
const HostelModel = require('./HostelModel');
const RoomModel = require('./RoomModel');
const RoomAllotmentModel = require('./RoomAllotmentModel');
const MaintenanceRequestModel = require('./MaintenanceRequestModel');
const MaintenanceExpenseModel = require('./MaintenanceExpenseModel');
const NotificationModel = require('./NotificationModel');
const AllotmentApplicationModel = require('./AllotmentApplicationModel');
const IssueModel = require('./IssueModel');

module.exports = {
  UserModel,
  StudentModel,
  HostelModel,
  RoomModel,
  RoomAllotmentModel,
  AllotmentApplicationModel,
  MaintenanceRequestModel,
  MaintenanceExpenseModel,
  NotificationModel,
  IssueModel
};