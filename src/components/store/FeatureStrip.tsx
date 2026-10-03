import {
  ControlIcon,
  EnergyIcon,
  ShieldIcon,
  SoundIcon,
  TruckIcon,
} from "@/components/store/Icons";

const features = [
  { title: "ارسال تخصصی", text: "حمل ایمن تا مقصد", Icon: TruckIcon },
  { title: "مصرف بهینه", text: "انتخاب کم‌مصرف", Icon: EnergyIcon },
  { title: "عملکرد کم‌صدا", text: "آرامش در خانه", Icon: SoundIcon },
  { title: "کنترل هوشمند", text: "مدیریت دقیق دما", Icon: ControlIcon },
  { title: "ضمانت اصالت", text: "خرید مطمئن", Icon: ShieldIcon },
];

export function FeatureStrip() {
  return (
    <section className="feature-strip" aria-label="مزایای خرید">
      {features.map(({ title, text, Icon }) => (
        <div key={title}>
          <span className="feature-icon">
            <Icon className="size-6" />
          </span>
          <span>
            <strong>{title}</strong>
            <small>{text}</small>
          </span>
        </div>
      ))}
    </section>
  );
}
