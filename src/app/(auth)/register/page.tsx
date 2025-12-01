import RegisterForm from "@/components/auth/RegisterForm";
import Link from "next/link";

export const metadata = {
  title: "Register - CodeSync Pro",
  description: "Create your CodeSync Pro account",
};

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        Create Your Account
      </h2>

      <RegisterForm />

      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}