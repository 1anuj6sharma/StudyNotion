import React from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { VscGear, VscSignOut, VscAccount, VscDashboard, VscVm, VscAdd, VscBroadcast, VscMortarBoard, VscBriefcase } from 'react-icons/vsc';
import { AiOutlineRobot } from 'react-icons/ai';

// Map of all available icons
const iconMap = {
  VscGear,
  VscSignOut,
  VscAccount,
  VscDashboard,
  VscVm,
  VscAdd,
  VscBroadcast,
  VscBriefcase, // Using VscBriefcase instead of VscCart
  VscMortarBoard,
  AiOutlineRobot
};

const SidebarLink = ({ data }) => {
  const location = useLocation();
  
  // Get the icon component or fallback to a default icon
  const Icon = iconMap[data.icon] || VscGear;

  const matchRoute = (linkPath) => {
    return matchPath({ path: linkPath }, location.pathname);
  };

  if (!data || !data.path || !data.name) {
    console.error('Invalid sidebar link data:', data);
    return null;
  }

  return (
    <div>
      <Link
        to={data.path}
        className={`relative flex gap-x-2 items-center text-sm font-medium px-3 md:px-8 py-2 cursor-pointer transition-all duration-200
        ${matchRoute(data.path) ? 'text-yellow-50 bg-yellow-800' : 'text-richblack-300'}`}
      >
        <span 
          className={`absolute left-0 top-0 h-full w-[0.15rem] bg-yellow-50 ${
            matchRoute(data.path) ? 'opacity-100' : 'opacity-0'
          }`}
        ></span>
        {React.isValidElement(Icon) ? Icon : <Icon className='text-lg' />}
        <p className='hidden md:block uppercase tracking-wider'>{data.name}</p>
      </Link>
    </div>
  );
};

export default SidebarLink;
