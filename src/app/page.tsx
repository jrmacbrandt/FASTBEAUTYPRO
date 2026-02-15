import { redirect } from 'next/navigation';

export default function RootLandingPage() {
  redirect('/login');
}
