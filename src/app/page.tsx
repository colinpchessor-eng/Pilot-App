import { Icons } from '@/components/icons';
import { LoginForm } from '@/components/login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center art-deco-bg p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl transition-shadow duration-300 hover:shadow-2xl">
          <CardHeader className="items-center text-center">
            <Icons.logo className="h-12 w-auto" />
            <CardTitle className="pt-4 text-2xl font-bold">
              FedexFlow
            </CardTitle>
            <CardDescription className="pt-2">
              Please sign in to access your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
          <Separator className="my-0" />
          <CardFooter className="p-4">
            <p className="w-full text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
