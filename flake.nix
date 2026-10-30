{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    parvus = {
      url = "github:recregt/parvus/v0.1.3";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, parvus, ... }:
    let
      forEach = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
    in
    {
      apps = forEach (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          app = name: runtimeInputs: text: {
            type = "app";
            program = pkgs.lib.getExe (pkgs.writeShellApplication { inherit name runtimeInputs text; });
          };
          browser =
            name:
            app name [ pkgs.nodejs_24 pkgs.pnpm ] ''
              CHROMIUM_PATH=${pkgs.lib.getExe pkgs.chromium} exec node scripts/${name}.ts "$@"
            '';
        in
        {
          lint = app "lint" [ pkgs.biome ] ''
            biome check --no-errors-on-unmatched --files-ignore-unknown=true "$@"
          '';
          nixfmt = app "nixfmt" [ pkgs.nixfmt ] ''
            nixfmt --check "$@"
          '';
          check = app "check" [ pkgs.nodejs_24 pkgs.pnpm pkgs.biome ] ''
            pnpm check
          '';
          screenshots = browser "screenshots";
          session = browser "session";
        }
      );

      devShells = forEach (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_24
              pkgs.pnpm
              pkgs.biome
              pkgs.nixfmt
              pkgs.lefthook
              pkgs.python3
              parvus.packages.${system}.default
            ];
          };
        }
      );
    };
}
