import React from 'react';
import { useSelector } from 'react-redux';
import { ACCOUNT_TYPE } from '../../../../utils/constants';

const Settings = () => {
  const { user } = useSelector((state) => state.profile);
  const isInstructor = user?.accountType === ACCOUNT_TYPE.INSTRUCTOR;

  return (
    <div className="w-full">
      <h1 className="mb-14 text-3xl font-medium text-richblack-5">
        Settings
      </h1>
      
      <div className="my-10 flex flex-col gap-y-6 rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-richblack-5">
              Profile Information
            </h2>
            <p className="text-sm text-richblack-300">
              Update your profile information
            </p>
          </div>
          <button
            className="cursor-pointer rounded-md bg-yellow-50 px-5 py-2 font-medium text-richblack-900"
            onClick={() => {}}
          >
            Edit Profile
          </button>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-richblack-5">
              Change Password
            </h2>
            <p className="text-sm text-richblack-300">
              Update your password
            </p>
          </div>
          <button
            className="cursor-pointer rounded-md bg-yellow-50 px-5 py-2 font-medium text-richblack-900"
            onClick={() => {}}
          >
            Change Password
          </button>
        </div>

        {isInstructor && (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-richblack-5">
                Payment Information
              </h2>
              <p className="text-sm text-richblack-300">
                Update your payment details
              </p>
            </div>
            <button
              className="cursor-pointer rounded-md bg-yellow-50 px-5 py-2 font-medium text-richblack-900"
              onClick={() => {}}
            >
              Update Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
