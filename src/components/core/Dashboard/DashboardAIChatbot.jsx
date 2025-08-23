import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import AIChatbot from './AIChatbot';
import { ACCOUNT_TYPE } from '../../../utils/constants';
import Spinner from '../../../components/common/Spinner';

const DashboardAIChatbot = () => {
  const profileSelector = createSelector(
    (state) => state.profile,
    (profile) => ({
      user: profile.user,
      loading: profile.loading
    })
  );

  const { user, loading } = useSelector(profileSelector);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not logged in or user data not loaded
    if (!user) {
      navigate('/login');
      return;
    }

    // Redirect if user doesn't have proper account type
    if (!user.accountType) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  // Show loading state while checking authentication
  if (loading || !user) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="p-8 bg-richblack-800 rounded-lg">
          <Spinner />
          <p className="mt-4 text-richblack-200">Loading your AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-10">
      <div className="bg-richblack-800 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-richblack-5 mb-4">
          {user.accountType === ACCOUNT_TYPE.INSTRUCTOR
            ? 'Course Creation Advisor'
            : 'Course Recommendation Advisor'}
        </h1>
        <p className="text-richblack-200 mb-8 text-lg">
          {user.accountType === ACCOUNT_TYPE.INSTRUCTOR
            ? 'Get personalized recommendations for creating new courses based on market demand and performance analysis.'
            : 'Find the perfect courses for you based on reviews, enrollment numbers, and market demand.'}
        </p>
        <div className="bg-richblack-700 rounded-lg p-6">
          <AIChatbot />
        </div>
      </div>
    </div>
  );
};

export default DashboardAIChatbot;
