# 🛡️ Google React reCAPTCHA v3

**google-react-recaptcha-v3** is a highly optimized and feature-rich React component for seamless Google reCAPTCHA v3 integration. Built with performance, security, and developer experience in mind.

This component provides imperative control via `ref`, extensive customization options, and follows Google's official reCAPTCHA v3 best practices.

## 🚀 Features

- ✅ **Google reCAPTCHA v3** - Latest version with score-based verification
- ✅ **Imperative Control** - Full control via `ref` with async/await support
- ✅ **TypeScript First** - Complete type safety and IntelliSense support
- ✅ **Performance Optimized** - Script caching, tree-shaking, and minimal bundle size (~1.8KB)
- ✅ **Multi-language Support** - Internationalization with `hl` parameter
- ✅ **Trusted Types** - CSP compliance for enhanced security
- ✅ **Auto-execution** - Background verification for analytics
- ✅ **Advanced Error Handling** - Comprehensive error management with timeouts
- ✅ **Reset Functionality** - Reset reCAPTCHA instances programmatically
- ✅ **Readiness State** - Check reCAPTCHA availability before execution

## 📦 Installation

```bash
npm install google-react-recaptcha-v3
# or
yarn add google-react-recaptcha-v3
# or
pnpm add google-react-recaptcha-v3
```

## 🛠️ Basic Usage

```tsx
import { useRef } from "react";
import { ReCaptchaV3, RecaptchaV3Ref } from "google-react-recaptcha-v3";

const LoginForm = () => {
  const recaptchaRef = useRef<RecaptchaV3Ref>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Execute reCAPTCHA verification
    const token = await recaptchaRef.current?.execute();

    if (token) {
      // Send token to your backend for verification
      const response = await fetch("/api/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recaptchaToken: token,
          // ... other form data
        }),
      });

      const result = await response.json();
      console.log("Verification result:", result);
    }
  };

  const handleRecaptchaSuccess = (token: string) => {
    console.log("reCAPTCHA token obtained:", token);
  };

  const handleRecaptchaError = (error: unknown) => {
    console.error("reCAPTCHA error:", error);
  };

  return (
    <form onSubmit={handleSubmit}>
      <ReCaptchaV3
        ref={recaptchaRef}
        siteKey="YOUR_SITE_KEY"
        action="login"
        onVerify={handleRecaptchaSuccess}
        onError={handleRecaptchaError}
      />

      <input type="email" placeholder="Email" required />
      <input type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
};
```

## 📚 Props Reference

| Prop           | Type                       | Required | Default | Description                                                      |
| -------------- | -------------------------- | -------- | ------- | ---------------------------------------------------------------- |
| `siteKey`      | `string`                   | ✅       | -       | Your Google reCAPTCHA v3 site key                                |
| `action`       | `string`                   | ✅       | -       | Action name for this verification (e.g., `login`, `submit_form`) |
| `hl`           | `string`                   | ❌       | -       | Language code (e.g., `en`, `es`, `fr`, `de`)                     |
| `onVerify`     | `(token: string) => void`  | ❌       | -       | Callback when token is successfully obtained                     |
| `onError`      | `(error: unknown) => void` | ❌       | -       | Callback when an error occurs                                    |
| `trustedTypes` | `boolean`                  | ❌       | `false` | Enable Trusted Types for CSP compliance                          |
| `timeout`      | `number`                   | ❌       | `5000`  | Script loading timeout in milliseconds                           |
| `autoExecute`  | `boolean`                  | ❌       | `false` | Execute reCAPTCHA automatically on mount                         |

## 🔗 Ref API

The component exposes the following methods via `ref`:

### `execute(): Promise<string | null>`

Executes reCAPTCHA with the configured action. Returns the verification token or `null` if failed.

```tsx
const token = await recaptchaRef.current?.execute();
if (token) {
  // Send to backend for verification
}
```

### `isReady(): boolean`

Checks if reCAPTCHA is loaded and ready for execution.

```tsx
if (recaptchaRef.current?.isReady()) {
  console.log("reCAPTCHA is ready!");
}
```

### `reset(): void`

Resets the reCAPTCHA instance (useful for testing or re-verification).

```tsx
recaptchaRef.current?.reset();
```

## 🎯 Advanced Use Cases

### 1. Auto-execution for Traffic Analysis

Perfect for homepage analytics without user interaction:

```tsx
const HomePage = () => {
  const analyticsRef = useRef<RecaptchaV3Ref>(null);

  const handleTrafficAnalysis = (token: string) => {
    // Send analytics data to your backend
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recaptchaToken: token }),
    });
  };

  return (
    <>
      <ReCaptchaV3
        ref={analyticsRef}
        siteKey="YOUR_SITE_KEY"
        action="homepage"
        autoExecute={true} // ✨ Executes automatically
        onVerify={handleTrafficAnalysis}
      />

      <main>{/* Your homepage content */}</main>
    </>
  );
};
```

### 2. E-commerce with Conditional Verification

Implement risk-based verification for transactions:

```tsx
const CheckoutForm = () => {
  const recaptchaRef = useRef<RecaptchaV3Ref>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handlePurchase = async (orderData: OrderData) => {
    const token = await recaptchaRef.current?.execute();

    const response = await fetch("/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...orderData,
        recaptchaToken: token,
      }),
    });

    const result = await response.json();

    // Google recommends different thresholds based on use case
    if (result.recaptchaScore < 0.3) {
      setNeedsVerification(true); // Require additional verification
    } else {
      processOrder(orderData); // Continue with purchase
    }
  };

  return (
    <div>
      <ReCaptchaV3
        ref={recaptchaRef}
        siteKey="YOUR_SITE_KEY"
        action="purchase"
        timeout={8000} // ✨ Longer timeout for critical operations
      />

      {needsVerification && <AdditionalVerificationStep />}

      <button onClick={handlePurchase}>Complete Purchase</button>
    </div>
  );
};
```

### 3. Trusted Types for Enhanced Security

For applications with strict Content Security Policy:

```tsx
const SecureForm = () => {
  return (
    <ReCaptchaV3
      siteKey="YOUR_SITE_KEY"
      action="secure_action"
      trustedTypes={true} // ✨ Enables Trusted Types support
      onVerify={(token) => {
        // Handle verification in CSP-compliant way
      }}
    />
  );
};
```

### 4. Multi-step Forms with State Management

```tsx
const MultiStepForm = () => {
  const recaptchaRef = useRef<RecaptchaV3Ref>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const handleStepSubmit = async () => {
    // Check if reCAPTCHA is ready before proceeding
    if (!recaptchaRef.current?.isReady()) {
      console.log("Please wait for reCAPTCHA to load...");
      return;
    }

    const token = await recaptchaRef.current.execute();

    if (token) {
      // Verify current step
      const isValid = await verifyStep(currentStep, token);
      if (isValid) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleReset = () => {
    recaptchaRef.current?.reset(); // ✨ Reset if needed
    setCurrentStep(1);
  };

  return (
    <div>
      <ReCaptchaV3
        ref={recaptchaRef}
        siteKey="YOUR_SITE_KEY"
        action={`step_${currentStep}`}
      />

      <StepContent step={currentStep} />

      <button onClick={handleStepSubmit}>Next Step</button>
      <button onClick={handleReset}>Start Over</button>
    </div>
  );
};
```

## 🌐 Internationalization

Support for multiple languages:

```tsx
<ReCaptchaV3
  siteKey="YOUR_SITE_KEY"
  action="submit"
  hl="es" // Spanish
/>

<ReCaptchaV3
  siteKey="YOUR_SITE_KEY"
  action="submit"
  hl="fr" // French
/>

<ReCaptchaV3
  siteKey="YOUR_SITE_KEY"
  action="submit"
  hl="de" // German
/>
```

## 🔐 Backend Verification

### Expected Response Format

```typescript
interface RecaptchaV3Response {
  success: boolean; // Whether the token is valid
  score: number; // 0.0 - 1.0 (1.0 = very likely human)
  action: string; // Verify this matches expected action
  challenge_ts: string; // ISO timestamp of challenge
  hostname: string; // Your domain name
  "error-codes"?: string[]; // Error codes if any
}
```

### Node.js Verification Example

```javascript
app.post("/api/verify-recaptcha", async (req, res) => {
  const { token, expectedAction } = req.body;

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      }
    );

    const data = await response.json();

    // Verify all required fields
    if (
      data.success &&
      data.action === expectedAction &&
      data.hostname === "yourdomain.com" &&
      data.score >= 0.5
    ) {
      // Adjust threshold based on use case

      res.json({
        success: true,
        score: data.score,
        message: "Verification successful",
      });
    } else {
      res.status(400).json({
        success: false,
        error: "reCAPTCHA verification failed",
        score: data.score || 0,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server error during verification",
    });
  }
});
```

## 📊 Recommended Score Thresholds

Based on [Google's official documentation](https://developers.google.com/recaptcha/docs/v3):

| Use Case             | Minimum Score | Recommended Action                |
| -------------------- | ------------- | --------------------------------- |
| **Homepage**         | 0.3           | Filter scrapers                   |
| **Login**            | 0.5           | Require 2FA for low scores        |
| **Social Features**  | 0.6           | Moderate risky comments           |
| **E-commerce**       | 0.7           | Additional verification           |
| **Account Creation** | 0.5           | Email verification for low scores |

## ⚡ Performance Features

- **Script Caching**: Prevents duplicate script loading
- **Tree Shaking**: Only includes used code
- **Minimal Bundle**: ~1.8KB gzipped
- **Code Splitting**: Supports dynamic imports
- **Memory Management**: Automatic cleanup on unmount

## 🛡️ Security Features

- **Trusted Types**: CSP compliance
- **Action Validation**: Ensures action names follow Google's rules
- **Timeout Protection**: Prevents hanging requests
- **Error Boundaries**: Graceful error handling

## 🔧 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  RecaptchaV3Ref,
  RecaptchaV3Props,
  RecaptchaV3Response,
} from "google-react-recaptcha-v3";

// All props are fully typed
const props: RecaptchaV3Props = {
  siteKey: "your-site-key",
  action: "form_submit",
  trustedTypes: true,
  timeout: 10000,
};

// Ref methods are type-safe
const ref = useRef<RecaptchaV3Ref>(null);
const token: string | null = await ref.current?.execute();
const ready: boolean = ref.current?.isReady() ?? false;
```

## 📋 Migration Guide

### From v1.0.0 to v1.1.0+

The API is backward compatible. New props are optional:

```tsx
// Before (still works)
<ReCaptchaV3
  siteKey="..."
  action="submit"
/>

// After (with new features)
<ReCaptchaV3
  siteKey="..."
  action="submit"
  trustedTypes={true}    // New
  timeout={8000}         // New
  autoExecute={false}    // New
/>
```

## ⚠️ Important Considerations

1. **Site Key Configuration**: Ensure your `siteKey` is configured for reCAPTCHA v3 in the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin)

2. **Action Names**: Must contain only alphanumeric characters, slashes, and underscores. Cannot be user-specific.

3. **Token Expiration**: reCAPTCHA tokens expire after 2 minutes. Execute when the user takes action, not on page load.

4. **Score Interpretation**: Start with a threshold of 0.5 and adjust based on your traffic analysis in the admin console.

5. **Backend Verification**: Always verify tokens on your backend. Never trust client-side verification alone.

## 🚀 Live Examples & Testing

Este proyecto incluye una suite completa de ejemplos interactivos que demuestran todas las funcionalidades en acción:

```bash
# Ejecutar ejemplos interactivos
npm run examples

# O directamente en el directorio examples
cd examples && npm install && npm run dev
```

### 🎮 Ejemplos Disponibles

Los ejemplos incluyen implementaciones completas y funcionales:

- 🔐 **Basic Login Form** - Integración básica con formularios de autenticación
- 📊 **Auto-Execute Analytics** - Ejecución automática para análisis de tráfico
- 🛒 **E-Commerce Checkout** - Verificación condicional basada en scores de riesgo
- 🔒 **Trusted Types Security** - Cumplimiento CSP y carga segura de scripts
- 📋 **Multi-Step Form** - Formularios complejos con gestión de estado multi-paso
- 🌍 **Internationalization** - Soporte multi-idioma con contexto cultural

Cada ejemplo es completamente interactivo con:

- ✅ Logs de actividad en tiempo real
- 🎯 UI moderna y responsive
- 🔍 Debugging integrado
- 📝 Documentación inline de funcionalidades

### 🧪 Test Keys

For testing environments, you can use Google's test keys:

```typescript
// Test keys (do not use in production)
const TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
const TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Andrés Felipe Hernández Aldana](https://github.com/AndresH11)

## 🔗 Resources

- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [React forwardRef Documentation](https://react.dev/reference/react/forwardRef)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## 🐛 Issues & Support

Found a bug or need help?

- 🐛 [Report Issues](https://github.com/AndresH11/google-react-recaptcha-v3/issues)

## 🌱 Creator

## [ Linkedin ] [Andrés Hernández](https://www.linkedin.com/in/andresh11/)

⭐ **If this package helped you, please consider giving it a star on GitHub!**
