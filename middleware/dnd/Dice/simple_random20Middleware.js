const rollRandom20 = () => Math.floor(Math.random() * 20) + 1;

const simple_random20Middleware = (req, res, next) => {
  const random20 = rollRandom20();

  req.random20 = random20;
  res.locals.random20 = random20;

  return next();
};

module.exports = {
  simple_random20Middleware,
  rollRandom20
};