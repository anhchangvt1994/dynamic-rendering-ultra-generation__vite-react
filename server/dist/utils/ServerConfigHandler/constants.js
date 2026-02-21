"use strict";Object.defineProperty(exports, "__esModule", {value: true});

 const defaultServerConfig = {
  locale: {
    enable: false,
    hideDefaultLocale: false,
    routes: {},
  },
  isRemoteCrawler: false,
  crawl: {
    enable: true,
    limit: 3,
    speed: 8000,
    content: 'same',
    cache: {
      enable: true,
      time: 72 * 3600, // 72 hours (second unit)
      renewTime: 6 * 60 * 60, // 6 hours (second unit)
    },
    compress: true,
    optimize: ['script'],
    routes: {},
  },
  routes: {
    content: 'same',
  },
  api: {
    list: {},
  },
}; exports.defaultServerConfig = defaultServerConfig
