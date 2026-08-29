import {httpsCallable} from "firebase/functions";
import {getFirebaseFunctions} from "../firebase/app";
import type {AppUser} from "../types/domain";

type NewPropertyUser = Pick<AppUser, "assignedPropertyIds" | "email" | "landlordAccess" | "role" | "username">;

export interface CreatedPropertyUser {
  email: string;
  passwordSetupLink: string;
  uid: string;
}

const createPropertyUser = () => httpsCallable<NewPropertyUser, CreatedPropertyUser>(getFirebaseFunctions(), "createPropertyUser");

export const userAccountRepository = {
  async create(user: NewPropertyUser): Promise<CreatedPropertyUser> {
    const result = await createPropertyUser()(user);
    return result.data;
  },
};
