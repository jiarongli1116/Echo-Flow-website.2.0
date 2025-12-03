'use client';

import UserPanelLayout from '@/app/users/panel/_components/UserPanelLayout';
import PasswordForm from './_components/PasswordForm';

export default function UserPasswordPage() {
  return (
    <UserPanelLayout pageTitle="修改密碼">
      <PasswordForm />
    </UserPanelLayout>
  );
}
