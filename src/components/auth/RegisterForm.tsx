"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FaGithub, FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email address";
    }

    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Must contain uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Must contain lowercase letter";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Must contain a number";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setValidationErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errorMap: Record<string, string> = {};
          data.errors.forEach((err: any) => {
            errorMap[err.field] = err.message;
          });
          setValidationErrors(errorMap);
        } else {
          setError(data.message || "Registration failed");
        }
        return;
      }

      // Auto-login after successful registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Registration successful, but login failed. Please try logging in.");
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthRegister = async (provider: string) => {
    setLoading(true);
    setError("");

    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (err) {
      setError(`Failed to sign up with ${provider}`);
      setLoading(false);
    }
  };

  return (
  <div className="w-full max-w-[440px]">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          
          {/* Compact Header */}
          <div className="text-center pt-8 pb-6 px-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create Account</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get started in seconds</p>
          </div>

          <div className="px-6 pb-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3 animate-shake">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* OAuth Buttons First */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleOAuthRegister("github")}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                <FaGithub className="w-4 h-4" />
                <span className="hidden sm:inline">GitHub</span>
              </button>

              {process.env.NEXT_PUBLIC_GOOGLE_ENABLED && (
                <button
                  onClick={() => handleOAuthRegister("google")}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  <FaGoogle className="w-4 h-4 text-red-500" />
                  <span className="hidden sm:inline">Google</span>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400 font-medium">or register with email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="name"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border ${
                    validationErrors.name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
                  } rounded-xl focus:ring-2 focus:border-transparent dark:text-white placeholder-gray-400 transition duration-200 disabled:opacity-50 text-sm`}
                />
                {validationErrors.name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 ml-1">{validationErrors.name}</p>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Email</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border ${
                    validationErrors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
                  } rounded-xl focus:ring-2 focus:border-transparent dark:text-white placeholder-gray-400 transition duration-200 disabled:opacity-50 text-sm`}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 ml-1">{validationErrors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className={`w-full px-4 py-2.5 pr-11 bg-gray-50 dark:bg-gray-800/50 border ${
                      validationErrors.password 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
                    } rounded-xl focus:ring-2 focus:border-transparent dark:text-white placeholder-gray-400 transition duration-200 disabled:opacity-50 text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 ml-1">{validationErrors.password}</p>
                )}
                {!validationErrors.password && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-1">Must include uppercase, lowercase & number</p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className={`w-full px-4 py-2.5 pr-11 bg-gray-50 dark:bg-gray-800/50 border ${
                      validationErrors.confirmPassword 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 dark:border-gray-700 focus:ring-indigo-500'
                    } rounded-xl focus:ring-2 focus:border-transparent dark:text-white placeholder-gray-400 transition duration-200 disabled:opacity-50 text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400 ml-1">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-5 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Terms - Compact */}
            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              By registering, you agree to our{" "}
              <a href="#" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">Terms</a>
              {" & "}
              <a href="#" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">Privacy</a>
            </p>

        
          </div>
        </div>

      </div>
  );
}