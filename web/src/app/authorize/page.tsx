import AuthorizeClient from '@/components/AuthorizeClient';
import { Suspense } from 'react';

export default function AuthorizePage() {
  return (
    <Suspense fallback={null}>
      <AuthorizeClient />
    </Suspense>
  );
}
