import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  getEmployees,
  getHrStats,
  createEmployee,
  getEmployeeById,
  completeOnboardingTask,
  updateEmployeeStatus,
  getUnlinkedUsers,
  getMyEmployeeProfile,
  updateMySelfOnboarding
} from "../controllers/employee.controller.js";
import {
  getMyAttendanceToday,
  getMyRecentAttendance,
  checkIn,
  checkInByPin,
  getAttendanceByDate,
} from "../controllers/attendance.controller.js";
import { uploadEmployeeDoc } from "../middleware/employeeDocUpload.middleware.js";
import {
  getMyLeaveRequests,
  requestLeave,
  getPendingLeaveRequests,
  reviewLeaveRequest,
} from "../controllers/leave.controller.js";
import {
  getMyWfhTasks,
  proposeWfhTask,
  getPendingWfhTasks,
  reviewWfhTask,
} from "../controllers/wfh.controller.js";
import {
  getTemplates,
  createTemplate,
  deleteTemplate,
  getAppraisals,
  createAppraisal,
  acknowledgeAppraisal,
  getMyAppraisals,
} from "../controllers/appraisal.controller.js";



const router = express.Router();




router.use(protect); // My Day needs to be reachable by any role with an Employee profile

router.get("/my-attendance/today", getMyAttendanceToday);
router.get("/my-attendance/recent", getMyRecentAttendance);
router.post("/my-attendance/check-in", checkIn);
router.get("/my-appraisals", getMyAppraisals);
router.patch("/appraisals/:id/acknowledge", acknowledgeAppraisal); 
router.get("/my-leave", getMyLeaveRequests);
router.post("/my-leave", requestLeave);
router.get("/my-wfh-tasks", getMyWfhTasks);
router.post("/my-wfh-tasks", proposeWfhTask);
router.get("/my-employee-profile", getMyEmployeeProfile);
router.patch("/my-employee-profile", uploadEmployeeDoc.single("document"), updateMySelfOnboarding);



// Everything below is HR/Manager/Super Admin only
router.use(authorize("SUPER_ADMIN_1", "SUPER_ADMIN_2", "OPERATIONS_MANAGER", "FACILITY_MANAGER", "HR"));

router.get("/appraisal-templates", getTemplates);
router.post("/appraisal-templates", createTemplate);
router.delete("/appraisal-templates/:id", deleteTemplate);
router.get("/appraisals", getAppraisals);
router.post("/appraisals", createAppraisal);
router.get("/leave/pending", getPendingLeaveRequests);
router.patch("/leave/:id/review", reviewLeaveRequest);
router.get("/wfh-tasks/pending", getPendingWfhTasks);
router.patch("/wfh-tasks/:id/review", reviewWfhTask);
router.get("/stats", getHrStats);
router.get("/employees", getEmployees);
router.get("/employees/unlinked-users", getUnlinkedUsers); // must stay above /employees/:id
router.post("/employees", createEmployee);
router.get("/employees/:id", getEmployeeById);
router.patch("/employees/:id/status", updateEmployeeStatus);
router.patch("/onboarding-tasks/:taskId/complete", completeOnboardingTask);

router.get("/attendance", getAttendanceByDate);
router.post("/attendance/pin-check-in", checkInByPin);

export default router;