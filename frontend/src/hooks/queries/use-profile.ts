'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import { setUser } from '@/store/auth-slice';
import type { AppDispatch } from '@/store';
import type { User, UpdateProfileDto, ChangePasswordDto } from '@/types';

/** Fetch current user profile */
export const useProfile = () => {
  return useQuery<User>({
    queryKey: queryKeys.users.me(),
    queryFn: async () => {
      const { data } = await api.get<User>(API_ENDPOINTS.USERS.ME);
      return data;
    },
  });
};

/** Update current user profile */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch<AppDispatch>();

  return useMutation<User, Error, UpdateProfileDto>({
    mutationFn: async (dto: UpdateProfileDto) => {
      const { data } = await api.patch<User>(API_ENDPOINTS.USERS.ME, dto);
      return data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      dispatch(setUser(updatedUser));
    },
  });
};

/** Change current user password */
export const useChangePassword = () => {
  return useMutation<void, Error, ChangePasswordDto>({
    mutationFn: async (dto: ChangePasswordDto) => {
      await api.patch(API_ENDPOINTS.USERS.ME_PASSWORD, dto);
    },
  });
};

/** Upload profile image */
export const useUploadProfileImage = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch<AppDispatch>();

  return useMutation<User, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<User>(API_ENDPOINTS.USERS.ME_PROFILE_IMAGE, formData);
      return data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
      dispatch(setUser(updatedUser));
    },
  });
};
