"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MdOutlineUploadFile, MdArrowForward } from "react-icons/md";

const ImportCard = () => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/import")}
      className="cursor-pointer rounded-2xl bg-purpleTheme shadow-lg hover:opacity-90 transition-opacity mt-6 mb-2 overflow-hidden"
    >
      <div className="flex items-center justify-between px-8 py-7 gap-6">
        {/* Left: text */}
        <div className="flex-1">
          <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-2">
            New feature
          </p>
          <h2 className="text-white text-2xl font-bold mb-2 leading-snug">
            Import Bank Statement
          </h2>
          <p className="text-purple-100 text-sm leading-relaxed max-w-sm">
            Upload a CSV, Excel or PDF from your bank. Transactions are
            automatically extracted, categorised, and checked for duplicates.
          </p>
          <div className="inline-flex items-center gap-2 mt-5 bg-white/20 hover:bg-white/30 transition rounded-lg px-4 py-2">
            <span className="text-white text-sm font-semibold">
              Start importing
            </span>
            <MdArrowForward className="text-white text-base" />
          </div>
        </div>

        {/* Right: big icon */}
        <MdOutlineUploadFile className="text-white/30 shrink-0 hidden sm:block" style={{ fontSize: 140 }} />
      </div>
    </div>
  );
};

export default ImportCard;
