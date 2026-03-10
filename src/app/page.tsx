import { Icons } from '@/components/icons';
import { LoginForm } from '@/components/login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="items-center text-center">
            <Icons.logo className="h-12 w-auto" />
            <CardTitle className="pt-4 text-2xl font-bold">
              Pilot Application Portal
            </CardTitle>
            <CardDescription className="pt-2">
              Please enter your credentials to access your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
