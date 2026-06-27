import { redirect } from 'next/navigation';

export default function RootPage() {
  // Middleware handles auth redirection, but if we land here, redirect to dashboard.
  redirect('/dashboard');
}
