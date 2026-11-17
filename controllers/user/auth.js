const isLogin = async (req, res, next) => {
  try {
    console.log("[AUTH DEBUG] isLogin check for:", req.method, req.originalUrl);
    console.log("[AUTH DEBUG] session.user_id:", req.session && req.session.user_id);

    if (req.session.user_id) {
      console.log("[AUTH DEBUG] access granted");
      next(); // If user is logged in, proceed to the next middleware/route handler
    } else {
      console.log("[AUTH DEBUG] access denied - redirecting to /");
      res.redirect("/"); // If user is not logged in, redirect to login page or appropriate route
    }
  } catch (error) {
    console.log("[AUTH DEBUG] error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const isLogout = async (req, res, next) => {
  try {
    console.log("[AUTH DEBUG] isLogout check for:", req.method, req.originalUrl);
    console.log("[AUTH DEBUG] session.user_id:", req.session && req.session.user_id);

    if (req.session.user_id) {
      console.log("[AUTH DEBUG] isLogout redirect to /login");
      res.redirect("/login"); // If user is logged in, redirect to the home page or appropriate route
    } else {
      console.log("[AUTH DEBUG] isLogout allowed");
      next(); // If user is not logged in, proceed to the next middleware/route handler
    }
  } catch (error) {
    console.log("[AUTH DEBUG] error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  isLogin,
  isLogout
};
