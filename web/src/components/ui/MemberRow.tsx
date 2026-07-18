"use client";

/**
 * MemberRow — design.md §8.2b: avatar + name + email + role select +
 * remove · default / hover / pending-invite / owner (owner's role is
 * immutable and the row carries no remove).
 */

import React from "react";
import { Trash2 } from "lucide-react";
import type { Member, OrgRole } from "@/models";
import { cn } from "@/lib/cn";
import Avatar from "./Avatar";
import Select from "./Select";
import Tag from "./Tag";

const ROLE_OPTIONS: Array<{ value: OrgRole; label: string }> = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

export interface MemberRowProps {
  member: Member;
  onRoleChange?: (role: OrgRole) => void;
  onRemove?: () => void;
  /** Viewer can manage members (role select + remove active). */
  canManage?: boolean;
  className?: string;
}

export const MemberRow: React.FC<MemberRowProps> = ({
  member,
  onRoleChange,
  onRemove,
  canManage = true,
  className,
}) => {
  const isOwner = member.role === "owner";
  const pending = member.status === "pending";
  return (
    <div
      role="row"
      data-state={pending ? "pending-invite" : isOwner ? "owner" : "default"}
      className={cn(
        "flex items-center gap-3 border-b border-border px-3 py-2",
        "transition-colors duration-fast ease-standard hover:bg-bg-elev",
        className,
      )}
    >
      <Avatar name={member.name || member.email} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-text">
            {member.name || member.email}
          </span>
          {pending ? <Tag tint="info">Invited</Tag> : null}
        </div>
        <div className="truncate text-[12px] text-text-2">{member.email}</div>
      </div>
      <div className="w-32 shrink-0">
        {isOwner ? (
          <span className="px-3 text-[13px] font-medium text-text-2">
            Owner
          </span>
        ) : (
          <Select
            options={ROLE_OPTIONS.filter((option) => option.value !== "owner")}
            value={member.role}
            onValueChange={(value) => onRoleChange?.(value as OrgRole)}
            size="sm"
            disabled={!canManage}
          />
        )}
      </div>
      {!isOwner && onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${member.name || member.email}`}
          disabled={!canManage}
          onClick={onRemove}
          className="rounded p-1.5 text-text-2 transition-colors duration-fast ease-standard hover:text-expense focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

export default MemberRow;
