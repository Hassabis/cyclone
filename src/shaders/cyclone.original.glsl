//Thanks to dray for some catches

//https://fragcoord.xyz/s/cx081tgx
void mainImage(out vec4 O, vec2 I)
{
    //3D Fire: https://fragcoord.xyz/s/3zoe0vgo
    float z,d,a,i,T=iTime;
    for(O*=i; i++<90.;)
    {
        vec3 p = z * normalize(vec3(I+I,0) - iResolution.xyy),t,Z;
        Z.x=6.*T, p.z+=9., t=p;
        d=2., a=(p.y-length(p.xz))/d-T;
        for(p.xz *= mat2(cos(a+T+vec4(0, 5, 8, 0)));
            d<4.; p+=sin(p.yzx * d - Z) / d)
            d/=.9;

        z += d = min(length(p.xz), 8.-abs(p.y)) / 15./(2.+cos(a));
        O += vec4(7, 5, z, 0) * d / length(t.xz-(p.xz/2.+3.)*sin(a));
    }
    O = tanh(O*O / 1e3);
}
