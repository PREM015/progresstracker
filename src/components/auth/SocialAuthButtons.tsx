"use client";

import React from "react";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaLinkedin } from "react-icons/fa";

const SocialAuthButtons: React.FC = () => {
  const providers = [
    { name: "Google", icon: <FcGoogle size={20} />, id: "google" },
    { name: "GitHub", icon: <FaGithub size={20} />, id: "github" },
    { name: "LinkedIn", icon: <FaLinkedin size={20} />, id: "linkedin" },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => signIn(provider.id)}
          className="flex items-center justify-center gap-2 px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {provider.icon}
          <span>Sign in with {provider.name}</span>
        </button>
      ))}
    </div>
  );
};

export default SocialAuthButtons;
