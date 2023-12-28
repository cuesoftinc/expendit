# User Authentication

A secure, fast and convinient way for users to log into the Expendit app.

Every Auth system has two parts:
* **Authentication**: should this person be allowed in? If yes, who are they?
* **Authorization**: when users access the app, what are they allowed to do?

### Authentication
The Expendit App uses a Password-based method for authentication (email and password).

### Authorization
A ProtectedRoute component is created and used to prevent an unknown user from accessing the app, the page is redirected to the sign-in page instead.

```tsx
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isLoading } = useSession();

  const storedValue: string | null = getLocalStorageItem('ExpenditLoggedIn');
  const isUserLoggedIn: string = storedValue !== null ? JSON.parse(storedValue) : null;

  useEffect(() => {
    if (!isUserLoggedIn) {
      router.push('/signin');
    }
  }, [router, isUserLoggedIn]);

  if (!isUserLoggedIn || isLoading) return <FullPageLoader />;

  return <>{children}</>;
};
```

### How it works
1. The user signs up. The Common server creates a new user in the database and a UserID is assigned to the user.
2. When the user logs in, the Common server returns a JWT. Every request to the database sends this JWT.
3. The user stays logged in for a specific time, after which the JWT is cleared from storage and the website re-routes to the sign-in page by the ProtectedRoute component.