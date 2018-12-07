// Jest configuration for functional tests

module.exports = {
  "transform": {
    "^.+\\.js?": "babel-jest",
  },
  "globals": {
    "widow": true,
  },
  "collectCoverage": true,
  "coverageDirectory": "coverage",
  "coverageReporters": [
    "html",
  ],
  "reporters": [
    "default",
    [
      "./node_modules/jest-html-reporter",
      {
        "pageTitle": "Functional Test Report",
      },
    ],
  ],
};
