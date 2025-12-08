// src/context/UserRoleContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "student" | "teacher";

interface UserRoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const UserRoleContext = createContext<UserRoleContextValue | undefined>(
  undefined
);

export const UserRoleProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // по умолчанию считаем, что зашёл "студент"
  const [role, setRole] = useState<UserRole>("student");

  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = (): UserRoleContextValue => {
  const ctx = useContext(UserRoleContext);
  if (!ctx) {
    throw new Error("useUserRole must be used within UserRoleProvider");
  }
  return ctx;
};
