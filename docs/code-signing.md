# Windows code signing

ASYNC release builds use Authenticode through `electron-builder`. The certificate and its password must never be committed to the repository.

## Repository secrets

Add these GitHub Actions secrets before creating the next release tag:

- `WIN_CSC_LINK`: base64-encoded `.pfx`/`.p12` certificate, an HTTPS URL, or another value accepted by `electron-builder`.
- `WIN_CSC_KEY_PASSWORD`: password for the certificate private key.

The release workflow calls `package:win:signed`, enables `forceCodeSigning`, and then verifies both `release/win-unpacked/ASYNC.exe` and the NSIS installer with `Get-AuthenticodeSignature`. Missing or invalid credentials stop the release instead of silently publishing unsigned executables.

Release AppImage, Debian, and Windows binaries also receive GitHub artifact attestations. Verify a downloaded binary with:

```powershell
gh attestation verify .\ASYNC-Setup-<version>-x64.exe --repo pedrotescaro/async
Get-AuthenticodeSignature .\ASYNC-Setup-<version>-x64.exe | Format-List Status,SignerCertificate,TimeStamperCertificate
```

`Status` must be `Valid`, and the signer must match the certificate owned by the ASYNC publisher. The existing `v0.1.0` release was created before signing enforcement and is intentionally documented as unsigned.
