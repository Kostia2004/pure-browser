/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _NS_DATASIGNATUREVERIFIER_H_
#define _NS_DATASIGNATUREVERIFIER_H_

#include "nsIDataSignatureVerifier.h"
#include "mozilla/Attributes.h"

#include "keythi.h"

typedef struct CERTCertificateStr CERTCertificate;

// 296d76aa-275b-4f3c-af8a-30a4026c18fc
#define NS_DATASIGNATUREVERIFIER_CID \
    { 0x296d76aa, 0x275b, 0x4f3c, \
    { 0xaf, 0x8a, 0x30, 0xa4, 0x02, 0x6c, 0x18, 0xfc } }
#define NS_DATASIGNATUREVERIFIER_CONTRACTID \
    "@mozilla.org/security/datasignatureverifier;1"

class nsDataSignatureVerifier final : public nsIDataSignatureVerifier
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIDATASIGNATUREVERIFIER

  nsDataSignatureVerifier()
  {
  }

private:
  ~nsDataSignatureVerifier()
  {
  }
};

namespace mozilla {

nsresult VerifyCMSDetachedSignatureIncludingCertificate(
  const SECItem& buffer, const SECItem& detachedDigest,
  nsresult (*verifyCertificate)(CERTCertificate* cert, void* context,
                                void* pinArg),
  void* verifyCertificateContext, void* pinArg);

} // namespace mozilla

#endif // _NS_DATASIGNATUREVERIFIER_H_
