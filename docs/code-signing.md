# Windows code signing

ASYNC release builds use Authenticode through `electron-builder`. The certificate and its password must never be committed to the repository.

## Repository secrets

If a code-signing certificate is available, add these GitHub Actions secrets:

- `WIN_CSC_LINK`: base64-encoded `.pfx`/`.p12` certificate, an HTTPS URL, or another value accepted by `electron-builder`.
- `WIN_CSC_KEY_PASSWORD`: password for the certificate private key.

When credentials are configured, the release workflow calls `package:win:signed`, enables `forceCodeSigning`, and verifies both `release/win-unpacked/ASYNC.exe` and the NSIS installer with `Get-AuthenticodeSignature`. If credentials are not present, the workflow packages an unsigned Windows release.

Release AppImage, Debian, and Windows binaries always receive GitHub artifact provenance attestations. When signed, verify a downloaded binary with:

```powershell
gh attestation verify .\ASYNC-Setup-<version>-x64.exe --repo pedrotescaro/async
Get-AuthenticodeSignature .\ASYNC-Setup-<version>-x64.exe | Format-List Status,SignerCertificate,TimeStamperCertificate
```

When signed, `Status` must be `Valid`, and the signer must match the certificate owned by the ASYNC publisher.
