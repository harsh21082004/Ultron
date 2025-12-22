export interface User {
  user: User;
  _id: string;
  name: string;
  email: string;
  profilePic: string,
  token: string;
  preferences: {
    theme: string;
    language: string;
  }
}
