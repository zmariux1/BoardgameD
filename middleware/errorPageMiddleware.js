const errorPageLoad = (req, res) => {
  res.status(404).render("errorPage", {
    userId: req.session?.user_id || null,
  });
};

module.exports = {
  errorPageLoad,
};
