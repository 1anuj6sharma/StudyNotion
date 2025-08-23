import { ACCOUNT_TYPE } from "../utils/constants";

const sidebarLinks = [
  // Common Links
  {
    id: 1,
    name: "My Profile",
    path: "/dashboard/my-profile",
    icon: "VscAccount",
  },
  // Settings is handled by the logout modal
  // {
  //   id: 2,
  //   name: "Settings",
  //   path: "/dashboard/settings",
  //   icon: "VscSettings",
  // },

  // Instructor Links
  {
    id: 3,
    name: "Dashboard",
    path: "/dashboard/instructor",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscDashboard",
  },
  {
    id: 4,
    name: "My Courses",
    path: "/dashboard/my-courses",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscVm",
  },
  {
    id: 5,
    name: "Add Course",
    path: "/dashboard/add-course",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscAdd",
  },
  {
    id: 6,
    name: "Live Classes",
    path: "/dashboard/live-classes",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscBroadcast",
  },
  {
    id: 7,
    name: "Create Live Class",
    path: "/dashboard/create-live-class",
    type: ACCOUNT_TYPE.INSTRUCTOR,
    icon: "VscAdd",
  },
  // AI Chatbot is accessible to both instructors and students
  {
    id: 8,
    name: "AI Chatbot",
    path: "/dashboard/ai-chatbot",
    type: [ACCOUNT_TYPE.INSTRUCTOR, ACCOUNT_TYPE.STUDENT],
    icon: "AiOutlineRobot",
  },

  // Student Links
  {
    id: 9,
    name: "Enrolled Courses",
    path: "/dashboard/enrolled-courses",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscMortarBoard",
  },
  {
    id: 10,
    name: "My Live Classes",
    path: "/dashboard/my-live-classes",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscBroadcast",
  },
  {
    id: 12,
    name: "Cart",
    path: "/dashboard/cart",
    type: ACCOUNT_TYPE.STUDENT,
    icon: "VscBriefcase",
  },
];

export default sidebarLinks;
