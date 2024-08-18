{
  inputs = {
    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    inputs@{
      nixpkgs,
      flake-parts,
      treefmt-nix,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ treefmt-nix.flakeModule ];

      systems = nixpkgs.lib.systems.flakeExposed;
      perSystem =
        {
          pkgs,
          self',
          lib,
          ...
        }:
        {
          devShells =
            let
              bareMinimum = with pkgs; [
                rustc
                cargo
                pkg-config
              ];
            in
            {
              default = pkgs.mkShell {
                nativeBuildInputs =
                  with pkgs;
                  bareMinimum
                  ++ [
                    cargo-tarpaulin
                    cargo-edit

                    rustfmt
                    clippy
                    openssl

                    solana-cli
                    solana-validator
                    anchor

                    act
                  ];
                RUST_BACKTRACE = 1;
                RUST_LOG = "warn,test,info";
              };
            };

          treefmt = {
            projectRootFile = "flake.nix";

            programs = {
              nixfmt.enable = true;
              rustfmt.enable = true;
              yamlfmt.enable = true;
              prettier.enable = true;
            };
          };
        };
    };
}
