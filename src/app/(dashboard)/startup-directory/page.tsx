import { redirect } from 'next/navigation';

export default function StartupDirectoryPage() {
  redirect('/directory?view=incubatees');
}
