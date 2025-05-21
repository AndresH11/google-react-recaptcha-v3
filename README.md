# 🛡️RecaptchaV3 React

**RecaptchaV3** is a highly reusable React component that allows you to easily integrate Google reCAPTCHA v3 into your React applications.

This component is designed to be simple to use and fully controlled via a `ref`, allowing you to execute reCAPTCHA on demand.

## 🚀 Features

- ✅ Based on Google reCAPTCHA v3
- ✅ Imperative control via `ref`
- ✅ Multi-language support (`hl`)
- ✅ Support for multiple actions
- ✅ Clean error handling
- ✅ TypeScript compatible

## 📦 Installation

```bash
npm install google-react-recaptcha-v3
# or
yarn add google-react-recaptcha-v3
# or
pnpm add google-react-recaptcha-v3

```

> Replace `google-react-recaptcha-v3` with your actual package name on npm.

---

## 🛠️ Basic Usage

```tsx
import { useRef } from "react";
import { RecaptchaV3, RecaptchaV3Ref } from "google-react-recaptcha-v3";

const MyForm = () => {
  const recaptchaRef = useRef<RecaptchaV3Ref>(null);

  const handleSubmit = async () => {
    const token = await recaptchaRef.current?.execute();
    if (token) {
      // Send token to your backend
      console.log("reCAPTCHA Token:", token);
    }
  };

  const handleRecaptchaSuccess = (token: string) => {
    console.log("reCAPTCHA token:", token);
  };

  const handleRecaptchaError = (err) => {
    console.log("reCAPTCHA error:", err);
  };

  return (
    <form onSubmit={handleSubmit}>
      <RecaptchaV3
        ref={recaptchaRef}
        siteKey="YOUR_SITE_KEY"
        action="submit_form"
        onVerify={handleRecaptchaSuccess}
        onError={handleRecaptchaError}
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default MyForm;
```

---

## 📚 Props

| Prop       | Type                       | Required | Description                                                                     |
| ---------- | -------------------------- | -------- | ------------------------------------------------------------------------------- |
| `siteKey`  | `string`                   | ✅       | Your Google reCAPTCHA v3 site key.                                              |
| `action`   | `string`                   | ✅       | The action name associated with the verification (`login`, `submit_form`, etc). |
| `hl`       | `string`                   | ❌       | Language code (e.g., `en`, `es`, `fr`).                                         |
| `onVerify` | `(token: string) => void`  | ❌       | Callback triggered after successfully obtaining a token.                        |
| `onError`  | `(error: unknown) => void` | ❌       | Callback triggered when an error occurs (e.g., script load failure).            |

---

## 🔁 Ref API

This component uses `forwardRef` and exposes the following method:

### `execute(): Promise<string | null>`

Executes reCAPTCHA with the action defined in the props. Returns the generated token, or `null` if there was an error.

#### Example:

```tsx
const token = await recaptchaRef.current?.execute();
```

---

## 🌐 Language Support

Use the `hl` prop to load the Google script in your preferred language.

```tsx
<RecaptchaV3 siteKey="..." action="login" hl="en" />
```

---

## ⚠️ Considerations

- Ensure your `siteKey` is configured for **reCAPTCHA v3** in the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin).
- The token must be validated on your server using your secret key.
- This component does not render any visible UI elements; it only loads the script and handles execution.

---

## 🧾 License

MIT © [Andrés Felipe Hernández Aldana](https://github.com/AndresH11)

---

## 🧠 Resources

- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [React `forwardRef` Documentation](https://reactjs.org/docs/forwarding-refs.html)
- [TypeScript](https://www.typescriptlang.org/)

---

Have suggestions or found a bug? Open an [Issue](https://github.com/AndresH11/google-react-recaptcha-v3/issues) or submit a PR.
