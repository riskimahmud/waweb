const phoneNumberFormatter = function (number) {
  // let formatted = number.replace(/\D/g, "");
  let formatted = number.replace(" ", "");

  if (formatted.startsWith("0")) {
    formatted = "62" + formatted.substr(1);
  }

  if (!formatted.endsWith("@c.us")) {
    formatted += "@c.us";
  }
  return formatted;
};

module.exports = {
  phoneNumberFormatter,
};
