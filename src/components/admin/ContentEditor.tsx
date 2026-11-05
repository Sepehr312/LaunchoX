"use client";
import { SliderEditor } from "@/components/admin/SliderEditor";
import { ContactEditor } from "@/components/admin/ContactEditor";
import { AboutEditor } from "@/components/admin/AboutEditor";
import type { AboutContact } from "@/components/store/AboutSections";
import type { ContentInput } from "@/validations/content";
export function ContentEditor({
  initial,
  contact = { phone: "", email: "", address: "" },
}: {
  initial: ContentInput;
  contact?: AboutContact;
}) {
  return initial.key === "slides" ? (
    <SliderEditor initial={initial} />
  ) : initial.key === "contact" ? (
    <ContactEditor initial={initial} />
  ) : (
    <AboutEditor initial={initial} contact={contact} />
  );
}
