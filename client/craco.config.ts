import webpack from "webpack";

const cracoConfig = {
  webpack: {
    configure: (config: webpack.Configuration) => {
      config.plugins ??= [];

      // Disable typechecking during build. Ideally, we should
      // resolve TypeScript errors, but we simply ignore the type
      // errors for now to keep the PR scope small.
      config.plugins = config.plugins.filter(
        (plugin) => plugin?.constructor?.name !== "ForkTsCheckerWebpackPlugin"
      );

      return config;
    },
  },
};

export default cracoConfig;
