import DashboardHome from '../components/core/Dashboard/DashboardHome';
import MyCourses from '../components/core/Dashboard/MyCourses';
import LiveClasses from '../components/core/Dashboard/LiveClasses';
import CreateCourse from '../components/core/Dashboard/CreateCourse';
import CourseDetails from '../components/core/Dashboard/CourseDetails';

const dashboardRoutes = [
  {
    path: '/dashboard',
    element: <DashboardHome />
  },
  {
    path: '/dashboard/my-courses',
    element: <MyCourses />
  },
  {
    path: '/dashboard/my-live-classes',
    element: <LiveClasses />
  },
  {
    path: '/dashboard/create-course',
    element: <CreateCourse />
  },
  {
    path: '/dashboard/course/:courseId',
    element: <CourseDetails />
  },
  ];

export default dashboardRoutes;
