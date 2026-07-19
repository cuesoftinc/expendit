import React from "react";
import Link from "next/link";

// Legacy-styled 404 (redesign lands with its own tranche). Live QA
// 2026-07-19: single h1 + a main landmark (it rendered two h1s and no
// landmarks), and the dead HOME/Contact Us buttons are real links now.
const NotFound = () => {
  return (
    <div className="bg-gradient-to-r from-purple-300 to-blue-200">
      <main className="w-9/12 m-auto py-16 min-h-screen flex items-center justify-center">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg pb-8">
          <div className="border-t border-gray-200 text-center pt-8">
            <p aria-hidden className="text-9xl font-bold text-purple-400">
              404
            </p>
            <h1 className="text-6xl font-medium py-8">oops! Page not found</h1>
            <p className="text-2xl pb-8 px-12 font-medium">
              Oops! The page you are looking for does not exist. It might have
              been moved or deleted.
            </p>
            <Link
              href="/"
              className="bg-gradient-to-r from-purple-400 to-blue-500 hover:from-pink-500 hover:to-orange-500 text-white font-semibold px-6 py-3 rounded-md mr-6 inline-block"
            >
              HOME
            </Link>
            <a
              href="https://github.com/cuesoftinc/expendit/issues"
              target="_blank"
              rel="noreferrer"
              className="bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-500 text-white font-semibold px-6 py-3 rounded-md inline-block"
            >
              Contact Us
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
