import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function UserRegistrationCyberEdition() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <>

<div className="scanline-overlay"></div>
{/*  TopAppBar Suppression Logic Applied: Transactional Flow  */}
{/*  Main Content Canvas  */}
<main className="flex-grow flex items-center justify-center p-gutter relative overflow-hidden">
{/*  Background Aesthetic Elements  */}
<div className="absolute inset-0 z-0 opacity-20">
<div className="absolute top-10 left-10 font-label-caps text-primary text-[10px]">SYSTEM_LOAD: 14.2%<br/>UPTIME: 42:12:09</div>
<div className="absolute bottom-10 right-10 font-label-caps text-secondary text-[10px] text-right">ENCRYPTION: AES_256_ACTIVE<br/>NODE_ID: CH_8832_X</div>
</div>
{/*  Registration Terminal Card  */}
<div className="relative z-10 w-full max-w-lg">
<div className="bg-surface-container border-2 border-primary-container p-1 shadow-[0_0_20px_rgba(0,240,255,0.2)] rounded-lg">
{/*  Terminal Header  */}
<div className="bg-surface-container-high px-4 py-2 flex justify-between items-center mb-6 rounded-t-md">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px] text-primary-container" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
<h1 className="font-label-caps text-on-surface">LAZPLAY // SECURE_ENTRY</h1>
</div>
<div className="flex gap-1">
<div className="w-3 h-3 bg-error rounded-full"></div>
<div className="w-3 h-3 bg-secondary-container rounded-full"></div>
<div className="w-3 h-3 bg-primary-container rounded-full"></div>
</div>
</div>
{/*  Registration Content  */}
<div className="px-6 pb-8">
<div className="mb-10 text-center">
<h2 className="font-headline-lg text-primary-container mb-2 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)] uppercase tracking-tight">USER_REGISTRATION // PROTOCOL</h2>
<p className="font-label-caps text-on-surface-variant opacity-70">ESTABLISHING NEW IDENTITY IN THE GRID...</p>
</div>
<form onSubmit={handleSubmit} className="space-y-6">
{/*  CODENAME Input  */}
<div className="group">
<label className="block font-label-caps text-primary-fixed-dim mb-2 flex items-center gap-2" htmlFor="codename">
<span className="material-symbols-outlined text-[14px]">person</span>
                [01] CODENAME
              </label>
<div className="relative neon-glow-primary transition-all rounded">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
<input className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-3 outline-none transition-colors placeholder:text-outline-variant rounded" id="codename" name="codename" placeholder="ENTER_ALIAS" type="text"/>
</div>
</div>
{/*  NET_ADDRESS Input  */}
<div className="group">
<label className="block font-label-caps text-primary-fixed-dim mb-2 flex items-center gap-2" htmlFor="net_address">
<span className="material-symbols-outlined text-[14px]">alternate_email</span>
                [02] NET_ADDRESS
              </label>
<div className="relative neon-glow-primary transition-all rounded">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
<input className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-3 outline-none transition-colors placeholder:text-outline-variant rounded" id="net_address" name="net_address" placeholder="IDENTITY@NETWORK.SYS" type="email"/>
</div>
</div>
{/*  SECURITY_PHRASE Input  */}
<div className="group">
<label className="block font-label-caps text-primary-fixed-dim mb-2 flex items-center gap-2" htmlFor="security_phrase">
<span className="material-symbols-outlined text-[14px]">lock</span>
                [03] SECURITY_PHRASE
              </label>
<div className="relative neon-glow-primary transition-all rounded">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container font-label-caps opacity-60">&gt;</span>
<input className="w-full bg-surface-container-low border border-outline-variant focus:border-primary-container text-on-surface font-body-md pl-10 py-3 outline-none transition-colors placeholder:text-outline-variant rounded" id="security_phrase" name="security_phrase" placeholder="********" type="password"/>
</div>
</div>
{/*  EXECUTE Button  */}
<div className="pt-4">
<button className="w-full bg-primary-container text-on-primary-container font-headline-md py-4 rounded hover:bg-primary-fixed-dim active:scale-[0.98] transition-all flex items-center justify-center gap-3 group shadow-[0_0_15px_rgba(0,240,255,0.4)]" type="submit">
<span className="material-symbols-outlined group-hover:animate-pulse">bolt</span>
                EXECUTE_REGISTRATION
              </button>
</div>
</form>
{/*  Footer Link  */}
<div className="mt-8 text-center">
<Link className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1" to="/login">
              ALREADY_MEMBER? [ ACCESS_TERMINAL ]
            </Link>
</div>
</div>
</div>
{/*  Component Side Decoration  */}
<div className="absolute -right-16 top-1/2 -translate-y-1/2 hidden lg:block">
<div className="space-y-4">
<div className="w-12 h-1 bg-primary-container flicker"></div>
<div className="w-8 h-1 bg-outline-variant"></div>
<div className="w-12 h-1 bg-secondary flicker" style={{}}></div>
</div>
</div>
</div>
</main>
{/*  Footer From Shared Components  */}
<footer className="w-full py-4 px-gutter flex flex-col md:flex-row justify-between items-center gap-4 mt-auto bg-surface-container-lowest border-t border-outline-variant">
<div className="flex flex-col md:flex-row items-center gap-6">
<Link to="/" className="font-display-xl text-primary opacity-20 select-none tracking-tighter">LAZPLAY</Link>
<p className="font-label-caps text-[10px] text-on-surface-variant">© 198X NEON_LABS_INC // ALL RIGHTS RESERVED</p>
</div>
<div className="flex gap-4">
<a className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container transition-colors" href="#">TERMINAL_DOCS</a>
<a className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container transition-colors" href="#">DISCORD_RELAY</a>
<a className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary-container transition-colors" href="#">GITHUB_REPOS</a>
</div>
</footer>
{/*  Aesthetic Image Mosaic (Background)  */}
<div className="fixed inset-0 -z-10 opacity-10 pointer-events-none grayscale">
<img className="w-full h-full object-cover" data-alt="A high-contrast close-up of a vintage 1980s computer motherboard with glowing green traces and electronic components. The image has a heavy CRT scanline effect and a dark, moody atmosphere. Neon accents in green and magenta highlight the intricate circuitry, creating a nostalgic yet high-tech cyberpunk aesthetic consistent with a retro terminal UI." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqaBJBC8csXu20mK7Q2_6_vfW_ZdEGr0-Au4yAK6t9ZsIHfPeneH5OtCaAvd5mAaXGMTMFXrQ3R7Mbx76tJvouQJgy6yfnBRt6e5Enr6Rtlas171WiFpwzryozEUqx3ht19jENgow4nuyjVou_mizE-o8CNsXR9mkwtkCYTJ1QAB9WPa15oj-O5W3ONC4Zq6VVAT9pzyKYyqYQIHFk4WQgq9oMO6U0XASjZIWREbW2ZBsaBqdQhF_yw2VQM6YREKJubmIZ5HhxRsjb"/>
</div>

    </>
  );
}
