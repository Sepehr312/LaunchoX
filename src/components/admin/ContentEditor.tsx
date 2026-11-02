"use client";
import { useState, useTransition } from "react";
import { saveContentAction } from "@/actions/admin/content.actions";
import type { ContentInput } from "@/validations/content";
export function ContentEditor({ initial }: { initial: ContentInput }) {
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const field = (
    label: string,
    text: string,
    change: (s: string) => void,
    multiline = false,
  ) => (
    <label key={label} className="grid gap-2">
      {label}
      {multiline ? (
        <textarea
          className="rounded border p-3"
          value={text}
          onChange={(e) => change(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          className="rounded border p-3"
          value={text}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </label>
  );
  const page = value.key === "about" || value.key === "services" ? value : null;
  return (
    <form
      className="grid gap-5 rounded border bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("");
        start(async () => {
          const result = await saveContentAction(value);
          setMessage(result.ok ? "تغییرات ذخیره شد" : result.error);
        });
      }}
    >
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        {page && (
          <>
            {field("عنوان صفحه", page.data.title, (title) =>
              setValue({ ...page, data: { ...page.data, title } }),
            )}
            {field(
              "متن معرفی",
              page.data.content,
              (content) =>
                setValue({ ...page, data: { ...page.data, content } }),
              true,
            )}
            <label>
              <input
                type="checkbox"
                checked={page.data.isActive}
                onChange={(e) =>
                  setValue({
                    ...page,
                    data: { ...page.data, isActive: e.target.checked },
                  })
                }
              />{" "}
              نمایش صفحه
            </label>
            <h2>بخش‌ها و کارت‌ها</h2>
            {page.data.sections.map((section, i) => (
              <fieldset className="grid gap-3 rounded border p-4" key={i}>
                <legend>بخش</legend>
                {(["title", "description", "imageUrl"] as const).map((key, j) =>
                  field(
                    ["عنوان", "توضیح", "نشانی تصویر"][j],
                    section[key],
                    (text) =>
                      setValue({
                        ...page,
                        data: {
                          ...page.data,
                          sections: page.data.sections.map((s, n) =>
                            n === i ? { ...s, [key]: text } : s,
                          ),
                        },
                      }),
                    key === "description",
                  ),
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => {
                      const sections = [...page.data.sections];
                      [sections[i - 1], sections[i]] = [
                        sections[i],
                        sections[i - 1],
                      ];
                      setValue({ ...page, data: { ...page.data, sections } });
                    }}
                  >
                    انتقال به بالا
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setValue({
                        ...page,
                        data: {
                          ...page.data,
                          sections: page.data.sections.filter(
                            (_, n) => n !== i,
                          ),
                        },
                      })
                    }
                  >
                    حذف بخش
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              onClick={() =>
                setValue({
                  ...page,
                  data: {
                    ...page.data,
                    sections: [
                      ...page.data.sections,
                      {
                        title: "بخش جدید",
                        description: "توضیحات بخش",
                        imageUrl: "",
                      },
                    ],
                  },
                })
              }
            >
              افزودن بخش
            </button>
            <h2>پرسش‌های متداول</h2>
            {page.data.questions.map((q, i) => (
              <fieldset className="grid gap-3 border p-4" key={i}>
                {field("پرسش", q.question, (question) =>
                  setValue({
                    ...page,
                    data: {
                      ...page.data,
                      questions: page.data.questions.map((v, n) =>
                        n === i ? { ...v, question } : v,
                      ),
                    },
                  }),
                )}
                {field(
                  "پاسخ",
                  q.answer,
                  (answer) =>
                    setValue({
                      ...page,
                      data: {
                        ...page.data,
                        questions: page.data.questions.map((v, n) =>
                          n === i ? { ...v, answer } : v,
                        ),
                      },
                    }),
                  true,
                )}
                <button
                  type="button"
                  onClick={() =>
                    setValue({
                      ...page,
                      data: {
                        ...page.data,
                        questions: page.data.questions.filter(
                          (_, n) => n !== i,
                        ),
                      },
                    })
                  }
                >
                  حذف پرسش
                </button>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const questions = [...page.data.questions];
                    [questions[i - 1], questions[i]] = [
                      questions[i],
                      questions[i - 1],
                    ];
                    setValue({ ...page, data: { ...page.data, questions } });
                  }}
                >
                  انتقال به بالا
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              onClick={() =>
                setValue({
                  ...page,
                  data: {
                    ...page.data,
                    questions: [
                      ...page.data.questions,
                      { question: "پرسش جدید", answer: "پاسخ پرسش" },
                    ],
                  },
                })
              }
            >
              افزودن پرسش
            </button>
          </>
        )}
        {value.key === "contact" &&
          (["phone", "email", "address"] as const).map((key, i) =>
            field(["تلفن", "ایمیل", "آدرس"][i], value.data[key], (text) =>
              setValue({ ...value, data: { ...value.data, [key]: text } }),
            ),
          )}
        {value.key === "slides" && (
          <>
            {value.data.map((slide, i) => (
              <fieldset
                className="grid gap-3 rounded border p-4"
                key={slide.id}
              >
                <legend>اسلاید</legend>
                {(
                  [
                    "dayImage",
                    "eyebrow",
                    "title",
                    "subtitle",
                    "description",
                  ] as const
                ).map((key, n) =>
                  field(
                    [
                      "نشانی تصویر",
                      "عنوان کوتاه",
                      "عنوان اصلی",
                      "زیرعنوان",
                      "توضیحات",
                    ][n],
                    slide[key],
                    (text) =>
                      setValue({
                        ...value,
                        data: value.data.map((s, j) =>
                          j === i ? { ...s, [key]: text } : s,
                        ),
                      }),
                  ),
                )}
                {(["primary", "secondary"] as const).map((key, n) => (
                  <div className="grid gap-3" key={key}>
                    {field(
                      n === 0 ? "متن دکمه اصلی" : "متن دکمه دوم",
                      slide[key].label,
                      (label) =>
                        setValue({
                          ...value,
                          data: value.data.map((s, j) =>
                            j === i ? { ...s, [key]: { ...s[key], label } } : s,
                          ),
                        }),
                    )}
                    {field("لینک داخل سایت", slide[key].href, (href) =>
                      setValue({
                        ...value,
                        data: value.data.map((s, j) =>
                          j === i ? { ...s, [key]: { ...s[key], href } } : s,
                        ),
                      }),
                    )}
                  </div>
                ))}
                <label>
                  <input
                    type="checkbox"
                    checked={slide.isActive}
                    onChange={(e) =>
                      setValue({
                        ...value,
                        data: value.data.map((s, j) =>
                          j === i ? { ...s, isActive: e.target.checked } : s,
                        ),
                      })
                    }
                  />{" "}
                  فعال
                </label>
                <button
                  type="button"
                  disabled={!i}
                  onClick={() => {
                    const data = [...value.data];
                    [data[i - 1], data[i]] = [data[i], data[i - 1]];
                    setValue({ ...value, data });
                  }}
                >
                  انتقال به بالا
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setValue({
                      ...value,
                      data: value.data.filter((_, j) => i !== j),
                    })
                  }
                >
                  حذف اسلاید
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              onClick={() =>
                setValue({
                  ...value,
                  data: [
                    ...value.data,
                    {
                      id: crypto.randomUUID(),
                      dayImage: "/images/arctic-showroom-light.webp",
                      eyebrow: "فروشگاه",
                      title: "اسلاید جدید",
                      subtitle: "زیرعنوان",
                      description: "توضیحات",
                      primary: { label: "محصولات", href: "/products" },
                      secondary: { label: "خدمات", href: "/services" },
                      isActive: true,
                    },
                  ],
                })
              }
            >
              افزودن اسلاید
            </button>
          </>
        )}
        <button className="rounded bg-blue-700 p-3 text-white" type="submit">
          {pending ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </button>
      </fieldset>
      <p role="status">{message}</p>
    </form>
  );
}
