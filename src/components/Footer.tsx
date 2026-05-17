
"use client";

import React from "react";
import Link from "next/link";
import { Rocket, Github, Youtube, Send, Twitter, Linkedin, Mail, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="pt-24 pb-12 bg-white/[0.01] border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-headline font-bold tracking-tighter uppercase">
                TESTLAB
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              India's premier AI-powered platform for competitive exam preparation. 
              Helping aspirants achieve excellence through technology.
            </p>
            <div className="flex gap-4">
              {[Send, Youtube, Twitter, Github].map((Icon, i) => (
                <Link key={i} href="#" className="p-2 bg-white/5 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/10 transition-all">
                  <Icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-headline font-bold mb-6">Explore Exams</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">SSC Exams</Link></li>
              <li><Link href="#" className="hover:text-primary">Banking Exams</Link></li>
              <li><Link href="#" className="hover:text-primary">Railway Exams</Link></li>
              <li><Link href="#" className="hover:text-primary">Engineering Exams</Link></li>
              <li><Link href="#" className="hover:text-primary">Medical Exams</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-headline font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">About Us</Link></li>
              <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary">Terms & Conditions</Link></li>
              <li><Link href="#" className="hover:text-primary">Refund Policy</Link></li>
              <li><Link href="#" className="hover:text-primary">Career</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-headline font-bold mb-6">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span>support@testlab.edu</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                <span>+91 98765 43210</span>
              </div>
              <div className="pt-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <div className="text-xs font-bold text-accent uppercase">Weekly Newsletter</div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Your Email" className="bg-transparent text-xs outline-none flex-1" />
                    <button className="text-primary font-bold text-xs uppercase hover:underline">Join</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2024 Testlab Education Technologies. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Cookies</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Compliance</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
