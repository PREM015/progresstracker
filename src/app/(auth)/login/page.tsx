import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";

export const metadata = {
  title: "Login - CodeSync Pro",
  description: "Login to your CodeSync Pro account",
};

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        Welcome Back
      </h2>

      <LoginForm />

      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
        not have an account?{" "}
        <Link
          href="/register"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}