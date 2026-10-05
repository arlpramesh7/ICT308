function validPhone(value) {
  if (typeof value !== 'string' || value.length > 25 || !/^[0-9+() \-]*$/.test(value)) return false;
  const digits = value.replace(/[() \-]/g, '');
  return digits === '' || /^(?:0[23478]\d{8}|\+61[23478]\d{8}|(?:1300|1800)\d{6}|13\d{4})$/.test(digits);
}
module.exports = { validPhone };
