import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // You can add logging or role checks later here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/create/:path*", "/settings/:path*"],
};
